import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as profile from '../services/profile.service.ts';
import * as inbox from '../services/inbox.service.ts';
import * as moderation from '../services/admin.service.ts';

export const getDonor: RequestHandler = async (req, res) => {
  res.json(await profile.getProfile(req.user!.id));
};
export const saveProfile: RequestHandler = async (req, res) => {
  res.json(await profile.saveProfile(req.user!.id, req.body));
};
export const saveDonor: RequestHandler = async (req, res) => {
  res.json(await profile.saveDonor(req.user!.id, req.body));
};
export const notifications: RequestHandler = async (req, res) => {
  res.json(await inbox.notifications(req.user!.id));
};
export const read: RequestHandler = async (req, res) => {
  res.json(await inbox.markRead(req.user!.id, z.uuid().parse(req.params.id)));
};
export const invitations: RequestHandler = async (req, res) => {
  res.json(await inbox.invitations(req.user!.id));
};
export const decline: RequestHandler = async (req, res) => {
  res.json(await inbox.decline(req.user!.id, z.uuid().parse(req.params.id)));
};
export const report: RequestHandler = async (req, res) => {
  res
    .status(201)
    .json(
      await moderation.report(
        req.user!.id,
        z.uuid().parse(req.params.id),
        z.string().trim().min(10).max(1000).parse(req.body.reason),
        z.uuid().optional().parse(req.body.target_id),
      ),
    );
};
export const adminOverview: RequestHandler = async (_req, res) => {
  res.json(await moderation.overview());
};
export const resolveReport: RequestHandler = async (req, res) => {
  res.json(
    await moderation.resolve(
      req.user!.id,
      z.uuid().parse(req.params.id),
      z.enum(['dismiss', 'remove', 'suspend']).parse(req.body.action),
    ),
  );
};
