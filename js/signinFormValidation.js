// **** variables ****
// api link
const API_URL =
  "https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/users_table";

// form
const forms = document.querySelectorAll(".needs-validation");
const email = document.getElementById("validationCustomUsername");
const password = document.getElementById("password");
const alertmsg = document.getElementById("alertmsg");
const rememberCheckbox = document.getElementById("invalidCheck");

// modal variables
const otpModal = new bootstrap.Modal(document.getElementById("otpModal"));
const verifyBtn = document.getElementById("verifyBtn");
const otpInput = document.getElementById("otpInput");
const otpError = document.getElementById("otpError");
const otpSuccess = document.getElementById("otpSuccess");
const emailNotExist = document.getElementById("emailNotExist");
const modalBody = document.querySelector(".modal-body p");

// email js
const forgetLink = document.querySelector(".forgetlink");
let isOtpSent = false;
let generatedOTP = "";
let targetEmail = "";

// (Validation)
function isEmailValid() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.value.trim());
}

function isPasswordValid() {
  return password.value.length > 0;
}

function isOtpEmailValid() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(otpInput.value.trim());
}

// ---------------------------------------------------------
// رسائل الخطأ (Validation Messages)

// Email
email.addEventListener("input", function () {
  const invalidFeedback =
    email.parentElement.querySelector(".invalid-feedback");
  const validFeedback = email.parentElement.querySelector(".valid-feedback");

  if (!isEmailValid()) {
    invalidFeedback.textContent = "Please enter a valid email address";
    email.classList.add("is-invalid");
    email.classList.remove("is-valid");
    email.setCustomValidity("invalid");
  } else {
    email.classList.remove("is-invalid");
    email.setCustomValidity("");
  }
});

// Password
password.addEventListener("input", function () {
  const invalidFeedback =
    password.parentElement.parentElement.querySelector(".invalid-feedback");
  const validFeedback =
    password.parentElement.parentElement.querySelector(".valid-feedback");

  if (!isPasswordValid()) {
    invalidFeedback.textContent = "Please enter your password";
    password.setCustomValidity("invalid");
  } else {
    password.setCustomValidity("");
  }
});

// otp email
otpInput.addEventListener("input", function () {
  const invalidFeedback =
    otpInput.parentElement.querySelector(".invalid-feedback");

  if (!isOtpSent) {
    if (!isOtpEmailValid()) {
      invalidFeedback.textContent = "Please enter a valid email address";
      otpInput.classList.add("is-invalid");
      invalidFeedback.classList.remove("d-none");
    } else {
      otpInput.classList.remove("is-invalid");
      invalidFeedback.classList.add("d-none");
    }
  } else {
    otpInput.classList.remove("is-invalid");
    invalidFeedback.classList.add("d-none");
    otpSuccess.textContent = "";
  }
});

// remember me
window.addEventListener("DOMContentLoaded", () => {
  const rememberedUser = JSON.parse(localStorage.getItem("currentUser"));
  if (rememberedUser) {
    email.value = rememberedUser.email;
    password.value = rememberedUser.password;
    rememberCheckbox.checked = true;
  }
});

// ---------------------------------------------------------
// (Login Logic)

(() => {
  "use strict";

  forms.forEach((form) => {
    form.addEventListener(
      "submit",
      async (event) => {
        // ضفنا async هنا
        event.preventDefault();

        if (!form.checkValidity() || !isEmailValid() || !isPasswordValid()) {
          event.stopPropagation();
          form.classList.add("was-validated");
          password.classList.add("is-invalid");
          return;
        }

        try {
          // 3. نجيب البيانات من الـ Mock API بدل الـ LocalStorage
          const response = await fetch(API_URL);
          const allUsers = await response.json();

          // 4. ندور على اليوزر اللي الإيميل والباسورد بتوعه متطابقين
          const userMatch = allUsers.find(
            (user) =>
              user.email === email.value && user.password === password.value,
          );

          if (userMatch) {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("currentUser", JSON.stringify(userMatch));

            if (rememberCheckbox.checked) {
              localStorage.setItem(
                "currentUser",
                JSON.stringify({
                  email: email.value,
                  password: password.value,
                }),
              );
            } else {
              localStorage.removeItem("currentUser");
            }
            window.location.href = "index.html";
          } else {
            alertmsg.classList.remove("d-none");
            password.setCustomValidity("Invalid email or password");
            password.value = "";
            password.classList.remove("is-valid");
            email.classList.remove("is-valid");
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          alert("حدث خطأ في الاتصال بالسيرفر، يرجى المحاولة مرة أخرى.");
        }

        form.classList.add("was-validated");
      },
      false,
    );
  });
})();

// ---------------------------------------------------------
// email js / Forget Password

forgetLink.addEventListener("click", function (e) {
  e.preventDefault();
  modalBody.textContent = "Please enter your email";
  otpInput.type = "email";
  verifyBtn.textContent = "Apply";

  otpInput.value = "";
  otpError.classList.add("d-none");
  otpSuccess.classList.add("d-none");
  emailNotExist.classList.add("d-none");

  otpModal.show();
});

// ضفنا async هنا عشان نقدر نكلم الـ API
verifyBtn.addEventListener("click", async function () {
  otpInput.classList.remove("is-invalid");
  otpError.classList.add("d-none");
  otpSuccess.classList.add("d-none");
  emailNotExist.classList.add("d-none");

  if (!isOtpSent) {
    const enteredEmail = otpInput.value.trim();
    if (!enteredEmail) {
      otpInput.classList.add("is-invalid");
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Checking..."; // ندي لليوزر إحساس إننا بنبحث

    try {
      // نجيب كل اليوزرز من الـ Mock API عشان نتأكد إن الإيميل موجود
      const response = await fetch(API_URL);
      let users = await response.json();
      const user = users.find((u) => u.email === enteredEmail);

      if (user) {
        generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
        targetEmail = user.email;

        const templateParams = {
          to_email: user.email,
          code: generatedOTP,
          name: user.firstName,
        };

        verifyBtn.textContent = "Sending...";

        emailjs
          .send("service_elxefnw", "template_1o90chi", templateParams)
          .then(
            function (response) {
              verifyBtn.disabled = false;
              otpSuccess.textContent =
                "Code has been sent to your email successfully!";
              otpSuccess.classList.remove("d-none");

              isOtpSent = true;
              otpInput.value = "";
              otpInput.type = "text";
              otpInput.placeholder = "Enter 4-digit code";
              otpInput.maxLength = 4;
              otpInput.minLength = 4;
              modalBody.textContent = "Enter the verification code";
              verifyBtn.textContent = "Verify Code";
            },
            function (error) {
              verifyBtn.disabled = false;
              verifyBtn.textContent = "Apply";
              otpError.textContent =
                "Failed to send email. Please try again later.";
              otpError.classList.remove("d-none");
            },
          );
      } else {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Apply";
        emailNotExist.classList.remove("d-none");
      }
    } catch (error) {
      console.error("Error connecting to API:", error);
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Apply";
      alert("حدث خطأ في الاتصال بالسيرفر. تأكد من الإنترنت.");
    }
  } else {
    // التحقق من الـ OTP
    const enteredCode = otpInput.value.trim();

    if (enteredCode === generatedOTP) {
      localStorage.setItem("emailForReset", targetEmail);
      otpModal.hide();
      window.location.href = "forgetPassword.html";
    } else {
      otpError.textContent = "Invalid code. Please try again.";
      otpError.classList.remove("d-none");
    }
  }
});
