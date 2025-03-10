import jwt from "jsonwebtoken";
import admin from "firebase-admin";

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Middleware para verificar el token JWT
const verifyToken = (req) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return { error: "Acceso denegado, token no proporcionado" };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { decoded };
  } catch (error) {
    return { error: "Token inválido o expirado" + error };
  }
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    // Verificar el token JWT
    const { decoded, error } = verifyToken(req);
    if (error) {
      return res.status(401).json({ message: "No autorizado", error });
    }

    const userId = decoded.userId;
    console.log("Usuario ID:", userId); 

    // Obtener los grupos a los que pertenece el usuario
    const groupsRef = db.collection("groups");
    const userGroupsSnapshot = await groupsRef
      .where("members", "array-contains", userId)
      .get();
    console.log("Grupos del usuario:", userGroupsSnapshot.size); 

    const groupIds = [];
    userGroupsSnapshot.forEach((doc) => {
      groupIds.push(doc.id);
    });
    console.log("IDs de los grupos:", groupIds); 

    // Obtener las tareas asignadas directamente al usuario
    const tasksRef = db.collection("tasks");
    const tasksSnapshot = await tasksRef
      .where("assignedTo", "array-contains", userId)
      .get();
    console.log("Tareas asignadas al usuario:", tasksSnapshot.size); 

    // Obtener las tareas asignadas a los grupos del usuario 
    let groupTasksSnapshot;
    if (groupIds.length > 0) {
      groupTasksSnapshot = await tasksRef.where("group", "in", groupIds).get();
      console.log("Tareas asignadas a los grupos:", groupTasksSnapshot.size); 
    } else {
      groupTasksSnapshot = { docs: [] }; 
    }

    // Combinar los resultados
    const tasks = [];
    tasksSnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    groupTasksSnapshot.docs.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    // Eliminar duplicados
    const uniqueTasks = [
      ...new Map(tasks.map((task) => [task.id, task])).values(),
    ];
    console.log("Tareas únicas:", uniqueTasks.length); 

    return res.status(200).json(uniqueTasks);
  } catch (error) {
    console.error("Error al obtener las tareas:", error); 
    return res
      .status(500)
      .json({ message: "Error interno del servidor", error: error.message });
  }
}
