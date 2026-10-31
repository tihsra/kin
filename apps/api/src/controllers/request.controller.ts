import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as requests from '../services/request.service.ts';
import * as offers from '../services/offer.service.ts';

const id = (value: unknown) => z.uuid().parse(value);
export const list: RequestHandler = async (req, res) => {
  res.json(await requests.list(req.user!.id, req.query));
};
export const detail: RequestHandler = async (req, res) => {
  res.json(await requests.details(req.user!.id, id(req.params.id)));
};
export const create: RequestHandler = async (req, res) => {
  res.status(201).json(await requests.create(req.user!.id, req.body));
};
export const edit: RequestHandler = async (req, res) => {
  res.json(await requests.edit(req.user!.id, id(req.params.id), req.body));
};
export const publish: RequestHandler = async (req, res) => {
  res.json(await requests.publish(req.user!.id, id(req.params.id)));
};
export const close: RequestHandler = async (req, res) => {
  res.json(
    await requests.close(
      req.user!.id,
      id(req.params.id),
      z.enum(['fulfilled', 'cancelled']).parse(req.body.status),
    ),
  );
};
export const remove: RequestHandler = async (req, res) => {
  res.json(await requests.removeDraft(req.user!.id, id(req.params.id)));
};
export const retry: RequestHandler = async (req, res) => {
  res.json(await requests.retry(req.user!.id, id(req.params.id)));
};
export const offer: RequestHandler = async (req, res) => {
  res.status(201).json(await offers.offer(req.user!.id, id(req.params.id), req.body));
};
export const confirm: RequestHandler = async (req, res) => {
  res.json(await offers.confirm(req.user!.id, id(req.params.id), id(req.params.offerId)));
};
export const withdraw: RequestHandler = async (req, res) => {
  res.json(
    await offers.withdraw(
      req.user!.id,
      id(req.params.id),
      id(req.params.offerId),
      req.body.action === 'reject',
    ),
  );
};
export const cancel: RequestHandler = async (req, res) => {
  res.json(await offers.cancel(req.user!.id, id(req.params.id)));
};
export const share: RequestHandler = async (req, res) => {
  res.json(await offers.share(req.user!.id, id(req.params.id)));
};
export const mine: RequestHandler = async (req, res) => {
  res.json(await offers.mine(req.user!.id));
};
