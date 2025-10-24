// src/services/authService.js

const login = async (email, password) => {
  // Şimdilik backend yoksa her zaman success döndürelim
  if (email === "test@test.com" && password === "123456") {
    return { token: "fake-token" };
  } else {
    throw new Error("Invalid credentials");
  }
};

export default {
  login,
};
