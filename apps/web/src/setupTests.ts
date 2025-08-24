import "@testing-library/jest-dom";

// Mock the env config for Jest
jest.mock("./config/env", () => ({
  env: {
    API_URL: "http://localhost:3001",
  },
}));
