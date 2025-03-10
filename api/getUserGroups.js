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
    // Verificar el token JWT y obtener los datos del usuario
    const { decoded, error } = verifyToken(req);
    if (error) {
      return res.status(401).json({ message: "No autorizado", error });
    }

    const userId = decoded.userId;

    // Obtener los grupos donde el usuario es creador o miembro
    const groupsRef = db.collection("groups");
    const creatorGroupsSnapshot = await groupsRef
      .where("creator", "==", userId)
      .get();
    const memberGroupsSnapshot = await groupsRef
      .where("members", "array-contains", userId)
      .get();

    // Combinar los resultados y eliminar duplicados
    const creatorGroups = [];
    const memberGroups = [];
    const groupIds = new Set();

    // Separar grupos en creador y miembro
    creatorGroupsSnapshot.forEach((doc) => {
      if (!groupIds.has(doc.id)) {
        creatorGroups.push({ id: doc.id, ...doc.data() });
        groupIds.add(doc.id);
      }
    });

    memberGroupsSnapshot.forEach((doc) => {
      if (!groupIds.has(doc.id)) {
        memberGroups.push({ id: doc.id, ...doc.data() });
        groupIds.add(doc.id);
      }
    });

    // Obtener los datos completos del creador y los miembros de cada grupo
    const usersRef = db.collection("users");
    const populatedCreatorGroups = await Promise.all(
      creatorGroups.map(async (group) => {
        const creatorDoc = await usersRef.doc(group.creator).get();
        const creator = { id: creatorDoc.id, ...creatorDoc.data() };

        const membersData = await Promise.all(
          group.members.map(async (memberId) => {
            const memberDoc = await usersRef.doc(memberId).get();
            return { id: memberDoc.id, ...memberDoc.data() };
          })
        );

        return {
          ...group,
          creator,
          members: membersData,
        };
      })
    );

    const populatedMemberGroups = await Promise.all(
      memberGroups.map(async (group) => {
        const creatorDoc = await usersRef.doc(group.creator).get();
        const creator = { id: creatorDoc.id, ...creatorDoc.data() };

        const membersData = await Promise.all(
          group.members.map(async (memberId) => {
            const memberDoc = await usersRef.doc(memberId).get();
            return { id: memberDoc.id, ...memberDoc.data() };
          })
        );

        return {
          ...group,
          creator,
          members: membersData,
        };
      })
    );

    // Respuesta exitosa con los grupos separados
    return res.status(200).json({
      creatorGroups: populatedCreatorGroups,
      memberGroups: populatedMemberGroups,
    });
  } catch (error) {
    console.error("Error al obtener los grupos:", error);
    return res
      .status(500)
      .json({ message: "Error interno del servidor", error: error.message });
  }
}
