console.log("eye toggle loaded");

// const togglePasswordIcon = document.getElementById("togglePassword");
const toggleRePasswordIcon = document.getElementById("toggleRePassword");
// غيرنا الأسامي هنا عشان التعارض
// const eyePasswordField = document.getElementById("password");
const eyeRePasswordField = document.getElementById("rePassword");

// togglePasswordIcon.addEventListener("click", function () {
//   if (eyePasswordField.type === "password") {
//     eyePasswordField.type = "text";
//     this.classList.replace("bi-eye", "bi-eye-slash");
//   } else {
//     eyePasswordField.type = "password";
//     this.classList.replace("bi-eye-slash", "bi-eye");
//   }
// });

toggleRePasswordIcon.addEventListener("click", function () {
  if (eyeRePasswordField.type === "password") {
    eyeRePasswordField.type = "text";
    this.classList.replace("bi-eye", "bi-eye-slash");
  } else {
    eyeRePasswordField.type = "password";
    this.classList.replace("bi-eye-slash", "bi-eye");
  }
});
