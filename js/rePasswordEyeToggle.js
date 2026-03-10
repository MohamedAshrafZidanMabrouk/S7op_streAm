console.log("eye toggle loaded");

const toggleRePasswordIcon = document.getElementById("toggleRePassword");
const eyeRePasswordField = document.getElementById("rePassword");

toggleRePasswordIcon.addEventListener("click", function () {
  if (eyeRePasswordField.type === "password") {
    eyeRePasswordField.type = "text";
    this.classList.replace("bi-eye", "bi-eye-slash");
  } else {
    eyeRePasswordField.type = "password";
    this.classList.replace("bi-eye-slash", "bi-eye");
  }
});
