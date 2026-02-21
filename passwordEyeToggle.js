const togglePasswordIcon = document.getElementById("togglePassword");
const passwordField = document.getElementById("password"); // غيرنا الاسم هنا

togglePasswordIcon.addEventListener("click", function () {
  if (passwordField.type === "password") {
    passwordField.type = "text";
    this.classList.remove("bi-eye");
    this.classList.add("bi-eye-slash");
  } else {
    passwordField.type = "password";
    this.classList.remove("bi-eye-slash");
    this.classList.add("bi-eye");
  }
});
