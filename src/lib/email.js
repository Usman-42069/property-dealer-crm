import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, html }) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'dummy@gmail.com',
        pass: process.env.EMAIL_PASS || 'dummy',
      },
    });

    // If no real email is configured, simulate it in the server console (prevents crashes during dev)
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
      console.log('\n✉️ --- SIMULATED EMAIL SENT ---');
      console.log(`To: ${to}\nSubject: ${subject}\nBody: ${html}\n`);
      return true;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}