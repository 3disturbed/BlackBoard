// Account with token using BlackBoard to cache example
// Assumes Blackboard is shared and init happened in server.js
// npm install bcrypt nodemailer jsonwebtoken
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import BB from './BlackBoard.js'; // Assumes BlackBoard is initialized in server.js
import config from './config.json'; // Importing configuration

// Extracting configurations from config.json
const { jwtSecret, email } = config;

// Email Configuration for Password Recovery
const transporter = nodemailer.createTransport({
  service: email.service,
  auth: {
    user: email.user,
    pass: email.pass
  }
});

// Account Object with Methods
const Account = {

  // Register a New User with Role
  async registerUser(email, password, role = 'user') {
    const user = await BB.get('users', email);
    if (user) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashedPassword, role, creditsBalance: 0 };
    await BB.set('users', email, newUser);
    console.log(`User registered successfully with role: ${role}`);
  },

  // Login an Existing User
  async loginUser(email, password) {
    const user = await BB.get('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Generate JWT token with user role
    const token = jwt.sign({ email, role: user.role }, jwtSecret, { expiresIn: '1h' });
    console.log('User logged in successfully');
    return token;
  },

  // Verify JWT Token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
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
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    await BB.set('users', email, { ...user, password: hashedTempPassword });

    await transporter.sendMail({
      from: email.user,
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

  // Add Credits to User Balance
  async addCredits(email, amount) {
    const user = await BB.get('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }
    user.creditsBalance += amount;
    await BB.set('users', email, user);
    console.log(`Added ${amount} credits to ${email}. New balance: ${user.creditsBalance}`);
  },

  // Remove Credits from User Balance
  async removeCredits(email, amount) {
    const user = await BB.get('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }
    if (user.creditsBalance < amount) {
      throw new Error('Insufficient credits');
    }
    user.creditsBalance -= amount;
    await BB.set('users', email, user);
    console.log(`Removed ${amount} credits from ${email}. New balance: ${user.creditsBalance}`);
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
