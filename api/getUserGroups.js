// api/getUserGroups.js
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
    // Verificar el token JWT y obtener los datos del usuario
    const user = verifyToken(req);
    const userId = user.userId;

    // Obtener los grupos donde el usuario es creador o miembro
    const groupsRef = db.collection('groups');
    const creatorGroupsSnapshot = await groupsRef.where('creator', '==', userId).get();
    const memberGroupsSnapshot = await groupsRef.where('members', 'array-contains', userId).get();

    // Combinar los resultados y eliminar duplicados
    const groups = [];
    const groupIds = new Set(); // Para evitar duplicados

    creatorGroupsSnapshot.forEach((doc) => {
      if (!groupIds.has(doc.id)) {
        groups.push({ id: doc.id, ...doc.data() });
        groupIds.add(doc.id);
      }
    });

    memberGroupsSnapshot.forEach((doc) => {
      if (!groupIds.has(doc.id)) {
        groups.push({ id: doc.id, ...doc.data() });
        groupIds.add(doc.id);
      }
    });

    // Obtener los datos del creador y los miembros de cada grupo
    const usersRef = db.collection('users');
    const populatedGroups = await Promise.all(
      groups.map(async (group) => {
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

    // Respuesta exitosa
    return res.status(200).json(populatedGroups);
  } catch (error) {
    console.error('Error al obtener los grupos:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}