// api/tasks.js
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';

// Cargar las credenciales desde la variable de entorno
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

// Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Middleware para verificar el token JWT
const verifyToken = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Acceso denegado, token no proporcionado');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Token inválido o expirado' + error);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    // Verificar el token JWT
    const user = verifyToken(req);
    const userId = user.userId;
    console.log("Usuario ID:", userId); // Log del ID del usuario

    // Obtener los grupos a los que pertenece el usuario
    const groupsRef = db.collection('groups');
    const userGroupsSnapshot = await groupsRef.where('members', 'array-contains', userId).get();
    console.log("Grupos del usuario:", userGroupsSnapshot.size); // Log del número de grupos

    // Extraer los IDs de los grupos
    const groupIds = [];
    userGroupsSnapshot.forEach((doc) => {
      groupIds.push(doc.id);
    });
    console.log("IDs de los grupos:", groupIds); // Log de los IDs de los grupos

    // Obtener las tareas asignadas directamente al usuario
    const tasksRef = db.collection('tasks');
    const tasksSnapshot = await tasksRef
      .where('assignedTo', 'array-contains', userId)
      .get();
    console.log("Tareas asignadas al usuario:", tasksSnapshot.size); // Log del número de tareas

    // Obtener las tareas asignadas a los grupos del usuario (solo si hay grupos)
    let groupTasksSnapshot;
    if (groupIds.length > 0) {
      groupTasksSnapshot = await tasksRef
        .where('group', 'in', groupIds)
        .get();
      console.log("Tareas asignadas a los grupos:", groupTasksSnapshot.size); // Log del número de tareas
    } else {
      groupTasksSnapshot = { docs: [] }; // Si no hay grupos, no hay tareas
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
    const uniqueTasks = [...new Map(tasks.map((task) => [task.id, task])).values()];
    console.log("Tareas únicas:", uniqueTasks.length); // Log del número de tareas únicas

    return res.status(200).json(uniqueTasks);
  } catch (error) {
    console.error('Error al obtener las tareas:', error); // Log del error
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}