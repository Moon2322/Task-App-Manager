// api/createGroup.js
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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    // Verificar el token JWT y obtener los datos del usuario
    const user = verifyToken(req);

    const { name, description, members } = req.body;

    // Validar campos obligatorios
    if (!name || !Array.isArray(members)) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    // Verificar que todos los emails correspondan a usuarios existentes
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.where('email', 'in', members).get();

    if (usersSnapshot.size !== members.length) {
      const existingEmails = usersSnapshot.docs.map((doc) => doc.data().email);
      const missingEmails = members.filter((email) => !existingEmails.includes(email));

      return res.status(400).json({
        message: 'Uno o más emails no corresponden a usuarios existentes',
        missingEmails,
      });
    }

    // Obtener los IDs de los usuarios
    const memberIds = usersSnapshot.docs.map((doc) => doc.id);

    // Crear el nuevo grupo
    const newGroup = {
      name,
      description,
      creator: user.userId, // ID del usuario que crea el grupo
      members: memberIds, // IDs de los miembros
      createdAt: new Date(), // Fecha de creación
    };

    // Guardar el grupo en Firestore
    const groupRef = await db.collection('groups').add(newGroup);

    // Obtener los datos del creador y los miembros
    const creatorDoc = await usersRef.doc(user.userId).get();
    const creator = { id: creatorDoc.id, ...creatorDoc.data() };

    const membersData = await Promise.all(
      memberIds.map(async (memberId) => {
        const memberDoc = await usersRef.doc(memberId).get();
        return { id: memberDoc.id, ...memberDoc.data() };
      })
    );

    // Respuesta exitosa
    return res.status(201).json({
      message: 'Grupo creado con éxito',
      group: {
        id: groupRef.id,
        ...newGroup,
        creator,
        members: membersData,
      },
    });
  } catch (error) {
    console.error('Error al crear el grupo:', error);
    return res.status(500).json({ message: 'Error al crear el grupo', error: error.message });
  }
}