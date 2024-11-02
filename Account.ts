import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

// Define User Interface
interface User {
  email: string;
  password: string;
  creditsBalance: number;
}

// Email Configuration for Password Recovery
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
});

// Helper Functions
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function validatePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Account Object with Methods
const Account = {
  
  // Register a New User
  async registerUser(email: string, password: string): Promise<void> {
    const user = await BB.get<User>('users', email);
    if (user) {
      throw new Error('User already exists');
    }
    const hashedPassword = await hashPassword(password);
    await BB.set('users', email, { email, password: hashedPassword, creditsBalance: 0 });
    console.log('User registered successfully');
  },

  // Login an Existing User
  async loginUser(email: string, password: string): Promise<void> {
    const user = await BB.get<User>('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }
    const isPasswordValid = await validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }
    console.log('User logged in successfully');
  },

  // Password Recovery
  async recoverPassword(email: string): Promise<void> {
    const user = await BB.get<User>('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }
    
    // Generate a temporary password (or token for reset)
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedTempPassword = await hashPassword(tempPassword);
    
    // Update with temporary password
    await BB.set('users', email, { ...user, password: hashedTempPassword });
    
    // Send email with temporary password
    await transporter.sendMail({
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Password Recovery',
      text: `Your temporary password is: ${tempPassword}`
    });
    console.log('Recovery email sent');
  },

  // Set or Update User Credits Balance
  async setUserCreditsBalance(email: string, amount: number): Promise<void> {
    const user = await BB.get<User>('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }
    user.creditsBalance = amount;
    await BB.set('users', email, user);
    console.log(`Credits balance set to ${amount} for ${email}`);
  },

  // Get User Credits Balance
  async getUserCreditsBalance(email: string): Promise<number> {
    const user = await BB.get<User>('users', email);
    if (!user) {
      throw new Error('User does not exist');
    }
    return user.creditsBalance || 0;
  },

  // Check if User Can Afford a Specific Amount
  async canAfford(email: string, amount: number): Promise<boolean> {
    const balance = await this.getUserCreditsBalance(email);
    return balance >= amount;
  }
};

// Example Usage
(async () => {
  try {
    const email = 'user@example.com';
    const password = 'securePassword123';

    // Register a new user
    await Account.registerUser(email, password);
    
    // Login the user
    await Account.loginUser(email, password);
    
    // Set and check credits balance
    await Account.setUserCreditsBalance(email, 100);
    const balance = await Account.getUserCreditsBalance(email);
    console.log(`Current balance for ${email}: ${balance}`);

    // Check affordability
    const amountToCheck = 50;
    const affordCheck = await Account.canAfford(email, amountToCheck);
    console.log(`${email} can afford ${amountToCheck}: ${affordCheck}`);

    // Recover password
    await Account.recoverPassword(email);

  } catch (error) {
    console.error(error.message);
  }
})();

export default Account;
