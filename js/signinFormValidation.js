// ---------------------------------------------------------
// **************** variables ****************
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

// email js for otp
const forgetLink = document.querySelector(".forgetlink");
let isOtpSent = false;
let generatedOTP = "";
let targetEmail = "";

//fieldset
let fieldset = document.getElementById("fieldset");
const numberCodeForm = document.querySelector("[data-number-code-form]");
const numberCodeInputs = [
  ...numberCodeForm.querySelectorAll("[data-number-code-input]"),
];

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
// **************** validation messages ****************

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

  emailNotExist.classList.add("d-none");

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
// **************** Login Logic ****************

(() => {
  "use strict";

  forms.forEach((form) => {
    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        if (!form.checkValidity() || !isEmailValid() || !isPasswordValid()) {
          event.stopPropagation();
          form.classList.add("was-validated");
          password.classList.add("is-invalid");
          return;
        }

        try {
          // get user data from mockup api
          const response = await fetch(API_URL);
          const allUsers = await response.json();
          const userByEmail = allUsers.find(
            (user) => user.email === email.value.trim(),
          );

          // لو الإيميل مش موجود
          if (!userByEmail) {
            alertmsg.innerHTML =
              "This email is not registered. <a class='my-link' href = './signup.html'> sign up</a>";
            alertmsg.classList.remove("d-none");

            password.value = "";
            password.classList.remove("is-valid");
            email.classList.remove("is-valid");
            email.value = "";
            return;
          }

          // لو الإيميل موجود بس الباسورد غلط
          if (userByEmail.password !== password.value) {
            alertmsg.textContent = "Incorrect email or password.";
            alertmsg.classList.remove("d-none");

            password.value = "";
            // password.classList.add("is-invalid");
            return;
          }

          //  لو الاتنين صح
          localStorage.setItem("isLoggedIn", "true");

          if (rememberCheckbox.checked) {
            // يحفظ البيانات لو علم على تذكرني
            localStorage.setItem("currentUser", JSON.stringify(userByEmail));
          } else {
            // ممكن تحفظ البيانات في sessionStorage عشان تضيع لما يقفل المتصفح
            sessionStorage.setItem("currentUser", JSON.stringify(userByEmail));
          }
          window.location.href = "index.html";
        } catch (error) {
          console.error("Error fetching data:", error);
          alert("failed to connect to server, try again");
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
              // otpInput.value = "";
              // otpInput.type = "text";
              // otpInput.placeholder = "Enter 4-digit code";
              // otpInput.maxLength = 4;
              // otpInput.minLength = 4;
              otpInput.classList.add("d-none");
              fieldset.classList.remove("d-none");
              fieldset.classList.add("d-flex");
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
    // const enteredCode = otpInput.value.trim();
    let otpValue = "";

    // بنلف على كل input وناخد الرقم اللي جواه ونلزقه في الـ String
    numberCodeInputs.forEach((input) => {
      otpValue += input.value;
    });

    if (otpValue === generatedOTP) {
      localStorage.setItem("emailForReset", targetEmail);
      otpModal.hide();
      window.location.href = "forgetPassword.html";
    } else {
      otpError.textContent = "Invalid code. Please try again.";
      otpError.classList.remove("d-none");
    }
  }
});

// === fieldset ===
numberCodeInputs.forEach((input) => {
  // Listen for typing events
  input.addEventListener("input", (e) => {
    // Prevent entering more than 1 digit per box
    if (e.target.value.length > 1) {
      e.target.value = e.target.value.slice(0, 1);
    }

    let currentIndex = Number(e.target.dataset.numberCodeInput);
    const nextIndex = currentIndex + 1;

    // If a number was typed and it's not the last input, focus the next one
    if (e.target.value !== "" && nextIndex < numberCodeInputs.length) {
      numberCodeInputs[nextIndex].focus();
    }
  });

  // Listen for Backspace to move focus backwards
  input.addEventListener("keydown", (e) => {
    let currentIndex = Number(e.target.dataset.numberCodeInput);
    const prevIndex = currentIndex - 1;

    // If Backspace is pressed, the input is already empty, and it's not the first input
    if (e.key === "Backspace" && e.target.value === "" && prevIndex >= 0) {
      numberCodeInputs[prevIndex].focus();
    }
  });
});
