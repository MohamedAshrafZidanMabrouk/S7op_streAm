// **** variables ****
const API_URL =
  "https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/users_table";
const password = document.getElementById("password");
const rePassword = document.getElementById("rePassword");
const forms = document.querySelectorAll(".needs-validation");
const emailForReset = localStorage.getItem("emailForReset");

/* =========================
   Sweet Toast
========================= */
const showToast = (message, icon = "success") => {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-center",
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true,
  });

  Toast.fire({
    icon: icon,
    title: message,
  });
};

/* =========================
   General UI Handler
========================= */
function setFieldState(input, isValid, message = "") {
  const container = input.closest(".col-12");
  const invalidFeedback = container.querySelector(".invalid-feedback");
  const validFeedback = container.querySelector(".valid-feedback");

  if (!isValid) {
    input.classList.add("is-invalid");
    input.classList.remove("is-valid");
    if (invalidFeedback) invalidFeedback.textContent = message;
    input.setCustomValidity("invalid");
  } else {
    input.classList.add("is-valid");
    input.classList.remove("is-invalid");
    if (validFeedback) validFeedback.textContent = message;
    input.setCustomValidity("");
  }
}

/* =========================
   Validation Logic
========================= */
function validatePassword() {
  const value = password.value;
  if (value.length < 7) {
    return {
      isValid: false,
      message: "Password must be at least 7 characters",
    };
  }
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#_\-])/;
  if (!regex.test(value)) {
    return {
      isValid: false,
      message: "Must contain uppercase, lowercase, number & special character",
    };
  }
  return { isValid: true, message: "Password looks good" };
}

function validateRePassword() {
  const value = rePassword.value;
  if (value.trim() === "")
    return { isValid: false, message: "Please confirm your password" };
  if (value !== password.value)
    return { isValid: false, message: "Passwords do not match" };
  return { isValid: true, message: "Passwords match" };
}

/* =========================
   Events
========================= */
password.addEventListener("input", () => {
  const result = validatePassword();
  setFieldState(password, result.isValid, result.message);
  if (rePassword.value !== "") {
    const reResult = validateRePassword();
    setFieldState(rePassword, reResult.isValid, reResult.message);
  }
});

rePassword.addEventListener("input", () => {
  const result = validateRePassword();
  setFieldState(rePassword, result.isValid, result.message);
});

/* =========================
   Forget Password Logic (API)
========================= */
(() => {
  "use strict";

  forms.forEach((form) => {
    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        // 1. فحص الـ Validation
        if (
          !form.checkValidity() ||
          !validatePassword().isValid ||
          !validateRePassword().isValid
        ) {
          event.stopPropagation();
          form.classList.add("was-validated");
          return;
        }

        // إظهار Loading على الزرار
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Updating...";

        try {
          // 2. نجيب كل المستخدمين من الـ API
          const response = await fetch(API_URL);
          const allUsers = await response.json();

          // 3. ندور على اليوزر المطلوب
          const userMatch = allUsers.find(
            (user) => user.email === emailForReset,
          );

          if (userMatch) {
            // 4. نحدث الباسورد في الـ API باستخدام الـ ID (طلب PUT)
            const updateResponse = await fetch(`${API_URL}/${userMatch.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: password.value }),
            });

            if (updateResponse.ok) {
              showToast("Password updated successfully!");

              // نمسح البيانات المؤقتة ونسجله دخول بالباسورد الجديد
              localStorage.removeItem("emailForReset");
              localStorage.setItem("isLoggedIn", "true");
              localStorage.setItem("currentUser", JSON.stringify(userMatch));

              setTimeout(() => {
                window.location.href = "index.html";
              }, 2000);
            } else {
              throw new Error("Failed to update password");
            }
          } else {
            showToast("User session expired. Please try again.", "error");
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
        } catch (error) {
          console.error("API Error:", error);
          showToast("Something went wrong. Please try again later.", "error");
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }

        form.classList.add("was-validated");
      },
      false,
    );
  });
})();
