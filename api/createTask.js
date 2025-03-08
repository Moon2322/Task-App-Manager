// api/createTask.js
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
    // Verificar el token JWT
    const user = verifyToken(req);

    const { Nametask, Description, category, deadline, group, assignedTo } = req.body;

    // Validar campos obligatorios
    if (!Nametask) {
      return res.status(400).json({ message: 'Nametask es un campo obligatorio' });
    }

    // Verificar si el grupo existe (si se proporciona)
    if (group) {
      const groupRef = db.collection('groups').doc(group);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        return res.status(400).json({ message: 'El grupo no existe' });
      }
    }

    // Validar que assignedTo sea un array (si se proporciona)
    if (assignedTo && !Array.isArray(assignedTo)) {
      return res.status(400).json({ message: 'assignedTo debe ser un array de emails' });
    }

    // Obtener los IDs de los usuarios asignados (si se proporciona)
    let assignedUserIds = [];
    if (assignedTo && assignedTo.length > 0) {
      const usersRef = db.collection('users');
      const usersSnapshot = await usersRef.where('email', 'in', assignedTo).get();

      // Verificar que todos los emails correspondan a usuarios existentes
      if (usersSnapshot.size !== assignedTo.length) {
        const existingEmails = usersSnapshot.docs.map((doc) => doc.data().email);
        const missingEmails = assignedTo.filter((email) => !existingEmails.includes(email));

        return res.status(400).json({
          message: 'Uno o más emails no corresponden a usuarios existentes',
          missingEmails,
        });
      }

      // Obtener los IDs de los usuarios
      assignedUserIds = usersSnapshot.docs.map((doc) => doc.id);
    }

    // Crear la nueva tarea
    const newTask = {
      Nametask,
      Description,
      category,
      status: 0, // Estado por defecto
      deadline: new Date(deadline), // Convertir a fecha
      userId: user.userId, // ID del usuario que crea la tarea
      group: group || null, // ID del grupo (opcional)
      createdBy: user.userId, // ID del usuario que crea la tarea
      assignedTo: assignedUserIds, // IDs de los usuarios asignados
      createdAt: new Date(), // Fecha de creación
    };

    // Guardar la tarea en Firestore
    const taskRef = await db.collection('tasks').add(newTask);

    // Respuesta exitosa
    return res.status(201).json({
      message: 'Tarea creada exitosamente',
      task: { id: taskRef.id, ...newTask }, // Incluir el ID generado por Firestore
    });
  } catch (error) {
    console.error('Error al crear la tarea:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}