const nodemailer=require("nodemailer")

async function sendVerificationEmail(email, otp) {
  try {
    console.log("SEND verification function", email + otp);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      //host: "smtp.gmail.com",
      // port:465,
      secure: true,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,

        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP  is ${otp}`,
      html: `<b>Your OTP :${otp}</b>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent")
    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}

module.exports = sendVerificationEmail;
