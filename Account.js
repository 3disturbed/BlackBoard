// Account with token using BlackBoard to cache example
// Assumes Blackboard is shared and init happened in server.js
// npm install bcrypt nodemailer jsonwebtoken
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import BB from './BlackBoard.js'; // Assumes BlackBoard is initialized in server.js

// JWT Secret for signing tokens
const JWT_SECRET = 'your_secret_key'; // Change this to a secure, private key in production

// Email Configuration for Password Recovery
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
});

// Helper Functions
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function validatePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Account Object with Methods
const Account = {

  // Register a New User with Role
  async registerUser(email, password, role = 'user') {
    const user = await BB.get('users', email);
    if (user) {
      throw new Error('User already exists');
    }

    const hashedPassword = await hashPassword(password);
    await BB.set('users', email, { email, password: hashedPassword, role, creditsBalance: 0 });
    console.log(`User registered successfully with role: ${role}`);
  },

  // Login an Existing User
  async loginUser(email, password) {
    const user = await BB.get('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }

    const isPasswordValid = await validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Generate JWT token with user role
    const token = jwt.sign({ email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    console.log('User logged in successfully');
    return token;
  },

  // Verify JWT Token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded; // Returns the decoded token (email, role)
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  // Role-based Access Control
  async checkRole(email, requiredRole) {
    const user = await BB.get('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }

    if (user.role !== requiredRole) {
      throw new Error('Insufficient permissions');
    }
    console.log(`Access granted for role: ${user.role}`);
  },

  // Password Recovery
  async recoverPassword(email) {
    const user = await BB.get('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedTempPassword = await hashPassword(tempPassword);
    await BB.set('users', email, { ...user, password: hashedTempPassword });

    await transporter.sendMail({
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Password Recovery',
      text: `Your temporary password is: ${tempPassword}`
    });
    console.log('Recovery email sent');
  },

  // Set or Update User Credits Balance
  async setUserCreditsBalance(email, amount) {
    const user = await BB.get('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }
    user.creditsBalance = amount;
    await BB.set('users', email, user);
    console.log(`Credits balance set to ${amount} for ${email}`);
  },

  // Get User Credits Balance
  async getUserCreditsBalance(email) {
    const user = await BB.get('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }
    return user.creditsBalance || 0;
  },

  // Check if User Can Afford a Specific Amount
  async canAfford(email, amount) {
    const balance = await this.getUserCreditsBalance(email);
    return balance >= amount;
  }
};

export default Account;
