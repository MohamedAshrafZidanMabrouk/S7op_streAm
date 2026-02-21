// نمسك الفورم اللي واخدة الكلاس ده
const forms = document.querySelectorAll(".needs-validation");
// modal
const otpModal = new bootstrap.Modal(document.getElementById("otpModal"));
const verifyBtn = document.getElementById("verifyBtn");
const otpInput = document.getElementById("otpInput");
const otpError = document.getElementById("otpError");
const otpSuccess = document.getElementById("otpSuccess");
const submitBtn = document.getElementById("submitBtn"); // تأكدي إن الزرار واخد ID ده في الـ HTML
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
(() => {
  "use strict";

  document
    .getElementById("otpModal")
    .addEventListener("hidden.bs.modal", function () {
      otpInput.value = ""; // مسح النص المكتوب
      otpError.classList.add("d-none"); // إخفاء رسالة الخطأ
      otpSuccess.classList.add("d-none");
      otpInput.classList.remove("is-invalid"); // إزالة اللون الأحمر
      verifyBtn.innerHTML = "Apply"; // إرجاع نص الزرار لو كان اتغير
      verifyBtn.disabled = false;
    });

  // نلف عليهم (لو عندك أكتر من فورم)
  forms.forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        // 1. فحص صحة الحقول (Bootstrap Validation)
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
          console.log("Form is invalid - check the red fields.");
        } else {
          event.preventDefault();

          // spinner
          submitBtn.disabled = true;
          btnText.textContent = "Sending...";
          btnSpinner.classList.remove("d-none");

          // 2. فحص هل الإيميل موجود مسبقاً قبل أي خطوة ثانية
          let allUsers = JSON.parse(localStorage.getItem("usersData")) || [];
          const isEmailTaken = allUsers.some(
            (user) => user.email === email.value,
          );
          const alertBox = document.getElementById("alreadyRegisteredAlert");

          if (isEmailTaken) {
            alertBox.classList.remove("d-none");
            alertBox.classList.add("d-flex");
            return; // بنوقف هنا ومش بنبعت OTP
          } else {
            alertBox.classList.add("d-none"); // إخفاء التنبيه لو كان ظاهر
          }

          // 3. لو الإيميل جديد، نبدأ عملية الـ OTP
          const otp = Math.floor(1000 + Math.random() * 9000).toString(); // توليد الكود

          const templateParams = {
            user_name: firstName.value,
            user_email: email.value,
            otp_code: otp,
          };

          console.log("Sending OTP...");

          emailjs
            .send("service_elxefnw", "template_5siit9k", templateParams)
            .then(function (response) {
              console.log("SUCCESS!", response.status);
              submitBtn.disabled = false;
              btnText.textContent = "Sign Up";
              btnSpinner.classList.add("d-none");

              // إظهار الـ Modal بدل الـ prompt
              otpModal.show();

              // برمجة زرار التأكيد داخل المودال
              verifyBtn.onclick = function () {
                if (otpInput.value === otp) {
                  // لو الكود صح:
                  verifyBtn.innerHTML =
                    '<span class="spinner-grow spinner-grow-sm"></span>';
                  // verifyBtn.classList.replace("btn-primary", "btn-success");
                  otpError.classList.add("d-none");
                  otpSuccess.classList.remove("d-none");
                  verifyBtn.disabled = true;

                  const newUser = {
                    id: Date.now(),
                    firstName: firstName.value,
                    lastName: lastName.value,
                    email: email.value,
                    password: password.value,
                    role: roleInput.value,
                    token: "TK-" + Math.random().toString(36).substr(2, 16),
                  };

                  allUsers.push(newUser);
                  localStorage.setItem("usersData", JSON.stringify(allUsers));
                  localStorage.setItem("isLoggedIn", "true");
                  localStorage.setItem("currentUser", JSON.stringify(newUser));

                  setTimeout(() => {
                    otpModal.hide();
                    window.location.href = "home.html";
                  }, 1500);
                } else {
                  // لو الكود غلط:
                  otpError.classList.remove("d-none");
                  otpInput.classList.add("is-invalid");
                }
              };
              otpInput.addEventListener("keypress", function (e) {
                if (e.key === "Enter") {
                  verifyBtn.click();
                }
              });
            })
            .catch(function (error) {
              submitBtn.disabled = false;
              btnText.textContent = "Sign Up";
              btnSpinner.classList.add("d-none");
              alert("Failed to send code. Please try again.");
            });
        }

        form.classList.add("was-validated");
      },
      false,
    );
  });
})();

// variables
let firstName = document.getElementById("firstName");
let lastName = document.getElementById("lastName");
let email = document.getElementById("email");
let password = document.getElementById("password");
let termsCheck = document.getElementById("invalidCheck");
const roleInput = document.getElementById("userRoleInput");

// first name
function isFirstNameValid() {
  const nameRegex = /^[A-Za-z\u0600-\u06FF]{3,}$/;
  return nameRegex.test(firstName.value);
}

// last name
function isLastNameValid() {
  const nameRegex = /^[A-Za-z\u0600-\u06FF]{3,}$/;
  return nameRegex.test(lastName.value);
}

// email
function isEmailValid() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.value);
}

// password
function isPasswordLengthValid() {
  return password.value.length >= 7;
}

function isPasswordPatternValid() {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#_\-])/;
  return regex.test(password.value);
}

// terms check
function isTermsAccepted() {
  return termsCheck.checked;
}

//----------------------------------------------------------------------

// validation messages

// first name
firstName.addEventListener("input", function () {
  const invalidFeedback =
    firstName.parentElement.querySelector(".invalid-feedback");

  const validFeedback =
    firstName.parentElement.querySelector(".valid-feedback");

  if (!isFirstNameValid()) {
    invalidFeedback.textContent =
      "First name must be at least 3 letters and contain only letters";
    firstName.classList.add("is-invalid");
    firstName.classList.remove("is-valid");
    firstName.setCustomValidity("invalid");
  } else {
    validFeedback.textContent = "Looks good!";

    firstName.classList.add("is-valid");
    firstName.classList.remove("is-invalid");

    firstName.setCustomValidity("");
  }
});

// last name
lastName.addEventListener("input", function () {
  const invalidFeedback =
    lastName.parentElement.querySelector(".invalid-feedback");

  const validFeedback = lastName.parentElement.querySelector(".valid-feedback");

  if (!isLastNameValid()) {
    invalidFeedback.textContent =
      "First name must be at least 3 letters and contain only letters";
    lastName.classList.add("is-invalid");
    lastName.classList.remove("is-valid");
    lastName.setCustomValidity("invalid");
  } else {
    validFeedback.textContent = "Looks good!";

    lastName.classList.add("is-valid");
    lastName.classList.remove("is-invalid");

    lastName.setCustomValidity("");
  }
});

// email
email.addEventListener("input", function () {
  const invalidFeedback =
    email.parentElement.querySelector(".invalid-feedback");

  const validFeedback = email.parentElement.querySelector(".valid-feedback");

  if (!isEmailValid()) {
    invalidFeedback.textContent = "Please enter a valid email";

    email.classList.add("is-invalid");
    email.classList.remove("is-valid");

    email.setCustomValidity("invalid");
  } else {
    validFeedback.textContent = "Email looks good";

    email.classList.add("is-valid");
    email.classList.remove("is-invalid");

    email.setCustomValidity("");
  }
});

//password
password.addEventListener("input", function () {
  const invalidFeedback =
    password.parentElement.parentElement.querySelector(".invalid-feedback");
  const validFeedback = password.parentElement.querySelector(".valid-feedback");
  if (!isPasswordLengthValid()) {
    invalidFeedback.textContent = "Password must be at least 7 characters";

    password.classList.add("is-invalid");
    password.classList.remove("is-valid");

    password.setCustomValidity("invalid");
  } else if (!isPasswordPatternValid()) {
    invalidFeedback.textContent =
      "Password must contain uppercase, lowercase, number and special character";

    password.classList.add("is-invalid");
    password.classList.remove("is-valid");

    password.setCustomValidity("invalid");
  } else {
    validFeedback.textContent = "Password looks good";
    password.classList.add("is-valid");
    password.classList.remove("is-invalid");

    password.setCustomValidity("");
  }
});

// terms check
termsCheck.addEventListener("change", function () {
  const invalidFeedback =
    termsCheck.parentElement.querySelector(".invalid-feedback");

  if (!isTermsAccepted()) {
    termsCheck.classList.add("is-invalid");
    termsCheck.classList.remove("is-valid");
    termsCheck.setCustomValidity("invalid");
  } else {
    termsCheck.classList.add("is-valid");
    termsCheck.classList.remove("is-invalid");
    termsCheck.setCustomValidity("");
  }
});

// role input
const options = document.querySelectorAll(".options p");
options.forEach((option) => {
  option.addEventListener("click", () => {
    // 1. شيل الـ active من الكل ورجعهم رمادي
    options.forEach((el) => {
      el.classList.remove("active");
      el.classList.add("text-secondary");
    });

    // 2. ضيف الـ active للاختيار اللي اتضغط عليه
    option.classList.add("active");
    option.classList.remove("text-secondary");

    // 3. أهم خطوة: تحديث قيمة الـ Hidden Input بـ الـ ID بتاع العنصر (buyer أو seller)
    roleInput.value = option.id;

    console.log("Current Role:", roleInput.value); // عشان تتأكدي في الـ Console إنه شغال
  });
});
