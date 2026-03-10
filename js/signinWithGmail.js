// =============================
// Sign Up With Google
// =============================

// let API_URL =
//   "https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/users_table";

async function handleCredentialResponse(response) {
  const googleData = parseJwt(response.credential);

  console.log("Google Data:", googleData);

  const email = googleData.email;
  const firstName = googleData.given_name || "";
  const lastName = googleData.family_name || "";

  try {
    // 1️⃣ نشوف هل المستخدم موجود
    const checkUser = await fetch(`${API_URL}?email=${email}`);
    const existingUsers = await checkUser.json();

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      // =========================
      // المستخدم موجود → Login
      // =========================
      const user = existingUsers[0];

      localStorage.setItem("currentUser", JSON.stringify(user));

      window.location.href = "index.html";
    } else {
      // =========================
      // المستخدم جديد → Sign Up
      // =========================
      const newUser = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        role: "buyer",
        token: generateToken(),
        password: null, // لأنه جاي من Google
      };

      const createUser = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      const createdUser = await createUser.json();

      localStorage.setItem("currentUser", JSON.stringify(createdUser));

      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// =============================
// Helper Functions
// =============================

function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = atob(base64Url);
  return JSON.parse(base64);
}

function generateToken() {
  return "TK-" + Math.random().toString(36).substring(2, 15);
}
