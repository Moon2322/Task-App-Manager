import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import fs from 'fs';

// Cargar el archivo JSON de credenciales
const serviceAccount = JSON.parse(fs.readFileSync('./../src/Connection/firebase.credencials.json', 'utf-8'));

// Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { username, password } = req.body;

  try {
    // Buscar el usuario en Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).get();

    if (snapshot.empty) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    // Obtener el primer usuario que coincida
    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // Generar token JWT
      const token = jwt.sign(
        { userId: userDoc.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );

      return res.status(200).json({
        message: "Inicio de sesión exitoso",
        token: token,
        user: { userId: userDoc.id, username: user.username, email: user.email },
      });
    } else {
      return res.status(400).json({ message: "Contraseña incorrecta" });
    }
  } catch (error) {
    console.log("Error con el login", error);
    return res.status(500).json({ error: "Error al iniciar sesión" });
  }
}