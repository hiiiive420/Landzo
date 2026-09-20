let authBridge = {
  getAccessToken: () => null,
  refreshSession: async () => null,
  clearSession: () => {},
};

export const registerAuthBridge = (bridge) => {
  authBridge = { ...authBridge, ...bridge };
};

export const getAuthBridge = () => authBridge;

