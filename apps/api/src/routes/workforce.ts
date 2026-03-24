import type { FastifyInstance } from 'fastify';

import { createWorkforceHandlers } from '../handlers/workforce';

export default async function workforceRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };
  const handlers = createWorkforceHandlers(app);

  app.get('/', auth, handlers.getOverview);
  app.put('/profiles/:userId', auth, handlers.upsertProfile);

  app.post('/availability', auth, handlers.saveAvailability);
  app.delete('/availability/:id', auth, handlers.deleteAvailability);

  app.post('/schedule/auto-build', auth, handlers.autoBuildSchedule);
  app.post('/schedule/publish', auth, handlers.publishSchedule);
  app.post('/shifts', auth, handlers.createShift);
  app.put('/shifts/:id', auth, handlers.updateShift);
  app.delete('/shifts/:id', auth, handlers.deleteShift);

  app.post('/requests', auth, handlers.createRequest);
  app.post('/requests/:id/review', auth, handlers.reviewRequest);

  app.post('/attendance/start', auth, handlers.startShift);
  app.post('/attendance/end', auth, handlers.endShift);

  app.post('/section-assignments/auto-assign', auth, handlers.autoAssignSections);
  app.post('/section-assignments/save', auth, handlers.saveSectionAssignments);
}
