import profile_pipeline from "../utils/profile_pipeline.js";

export function configureProfileRouter(profileRouter, client) {

  profileRouter.get('/profile', (req, res) => {
    res.sendFile('public/profile.html', { root: '.' });
  });

  profileRouter.get('/api/profile', async (req, res) => {
    if (!req.user) return res.send({ error: 'Not logged in.' });
    const result = await profile_pipeline.get(client, req.user._id);
    res.send(result);
  });
}
