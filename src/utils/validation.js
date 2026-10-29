const { z } = require('zod');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID').transform(value => value.toLowerCase());
const name = z.string().trim().min(2).max(80);
const email = z.string().trim().email().max(200).transform(x => x.toLowerCase());
const password = z.string().min(8).max(72);
const register = z.object({ name, email, password });
const login = z.object({ email, password: z.string().min(1) });
const profile = z.object({ name: name.optional(), phone: z.string().regex(/^[+\d ()-]{8,18}$/).or(z.literal('')).optional() });
const itemRequest = z.object({ menuItem: objectId, quantity: z.number().int().min(1).max(30) });
const orderInput = z.object({
  items: z.array(itemRequest).min(1).max(30), table: objectId,
  paymentMethod: z.enum(['cash','upi','card']),
  instructions: z.string().trim().max(400).default(''),
  offerCode: z.string().trim().toUpperCase().max(40).default('')
});
const menuItem = z.object({
  name: name, description: z.string().trim().max(300).default(''), category: objectId,
  pricePaise: z.number().int().min(100).max(10000000),
  imageKey: z.enum(['coffee','tea','pastry','sandwich','dessert','juice']).default('coffee'),
  available: z.boolean().default(true), active: z.boolean().default(true)
});
const category = z.object({ name });
const table = z.object({ number: z.string().trim().min(1).max(12).regex(/^[a-z\d-]+$/i), active: z.boolean().default(true) });
const offer = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),
  type: z.enum(['percent','fixed','combo']),
  value: z.number().int().min(0).max(10000000).default(0),
  minimumPaise: z.number().int().min(0).max(10000000).default(0),
  expiresAt: z.string().datetime(), active: z.boolean().default(true),
  comboPricePaise: z.number().int().nonnegative().default(0),
  comboItems: z.array(itemRequest).max(10).default([]),
  audience:z.enum(['all','selected','regular']).default('all'),
  eligibleCustomers:z.array(objectId).max(100).default([])
}).superRefine((o,ctx) => {
  if (o.audience==='selected' && o.eligibleCustomers.length===0) ctx.addIssue({code:'custom',message:'Select at least one customer for a private offer.'});
  if (new Set(o.eligibleCustomers).size!==o.eligibleCustomers.length) ctx.addIssue({code:'custom',message:'Duplicate selected customers.'});
  if (o.type === 'percent' && (o.value < 1 || o.value > 100)) ctx.addIssue({code:'custom',message:'Percent discount must be 1–100'});
  if (o.type === 'fixed' && o.value < 1) ctx.addIssue({code:'custom',message:'Fixed discount must exceed zero'});
  if (o.type === 'combo' && (!o.comboItems.length || o.comboPricePaise < 1)) ctx.addIssue({code:'custom',message:'Combo needs items and a positive combo price'});
});
const parse = (schema, body) => schema.parse(body);
module.exports = { z, parse, objectId, register, login, profile, orderInput, menuItem, category, table, offer };
