console.log("eye toggle loaded");

const togglePasswordIcon = document.getElementById("togglePassword");
const eyePasswordField = document.getElementById("password");

togglePasswordIcon.addEventListener("click", function () {
  if (eyePasswordField.type === "password") {
    eyePasswordField.type = "text";
    this.classList.replace("bi-eye", "bi-eye-slash");
  } else {
    eyePasswordField.type = "password";
    this.classList.replace("bi-eye-slash", "bi-eye");
  }
});
