const nodemailer = require("nodemailer");

// STEP 1 — Create a reusable email sending function
const sendResetEmail = async (options) => {
  // STEP 2 — Create transporter using SMTP config
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g. "gmail"
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD, // app password
    },
  });

  // STEP 3 — Define email options
  const mailOptions = {
    from: `Support <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // STEP 4 — Send email (await so errors propagate)
  await transporter.sendMail(mailOptions);
};

module.exports = sendResetEmail;
