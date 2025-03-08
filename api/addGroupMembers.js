// api/addGroupMembers.js
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
    verifyToken(req);

    const { emails } = req.body;
    const groupId = req.query.groupId; // Obtener el ID del grupo desde la URL

    // Verificar que todos los emails correspondan a usuarios existentes
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.where('email', 'in', emails).get();

    if (usersSnapshot.size !== emails.length) {
      const existingEmails = usersSnapshot.docs.map((doc) => doc.data().email);
      const missingEmails = emails.filter((email) => !existingEmails.includes(email));

      return res.status(400).json({
        message: 'Algunos emails no existen',
        missingEmails,
      });
    }

    // Obtener los IDs de los usuarios
    const userIds = usersSnapshot.docs.map((doc) => doc.id);

    // Obtener el grupo
    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }

    // Obtener los miembros actuales del grupo
    const currentMembers = groupDoc.data().members || [];

    // Agregar los nuevos miembros (evitando duplicados)
    const updatedMembers = [...new Set([...currentMembers, ...userIds])];

    // Actualizar el grupo con los nuevos miembros
    await groupRef.update({ members: updatedMembers });

    // Respuesta exitosa
    return res.status(200).json({ message: 'Miembros agregados exitosamente' });
  } catch (error) {
    console.error('Error al agregar miembros al grupo:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}