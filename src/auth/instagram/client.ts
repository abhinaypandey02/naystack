export const getInstagramAuthorizationURLSetup =
  (clientId: string, redirectURL: string) => (token: string) =>
    `https://www.instagram.com/oauth/authorize?client_id=${clientId}&response_type=code&enable_fb_login=0&force_authentication=1&scope=instagram_business_basic&state=${token}&redirect_uri=${redirectURL}`;
