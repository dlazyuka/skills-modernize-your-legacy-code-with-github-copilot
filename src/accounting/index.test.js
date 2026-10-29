'use strict';

const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const test = require('node:test');

const {
  INITIAL_BALANCE_CENTS,
  MAX_AMOUNT_CENTS,
  createAccount,
  formatBalance,
  parseAmount,
  runApp,
} = require('./index');

test('new account starts at the COBOL initial balance', () => {
  const account = createAccount();

  assert.equal(account.getBalanceCents(), INITIAL_BALANCE_CENTS);
  assert.equal(formatBalance(account.getBalanceCents()), '1000.00');
});

test('amount parser accepts nonnegative values with up to two decimals', () => {
  assert.equal(parseAmount('125'), 12500);
  assert.equal(parseAmount('125.5'), 12550);
  assert.equal(parseAmount('0.00'), 0);
  assert.equal(parseAmount('999999.99'), MAX_AMOUNT_CENTS);
  assert.equal(parseAmount('-1.00'), null);
  assert.equal(parseAmount('1.001'), null);
  assert.equal(parseAmount('1000000.00'), null);
  assert.equal(parseAmount('not-a-number'), null);
});

test('credit and debit update the balance using exact cents', () => {
  const account = createAccount();

  assert.deepEqual(account.credit(12550), { success: true, balanceCents: 112550 });
  assert.deepEqual(account.debit(2550), { success: true, balanceCents: 110000 });
  assert.equal(formatBalance(account.getBalanceCents()), '1100.00');
});

test('debit permits the exact balance and rejects overdrafts without mutation', () => {
  const account = createAccount(10000);

  assert.deepEqual(account.debit(10001), {
    success: false,
    reason: 'insufficient-funds',
    balanceCents: 10000,
  });
  assert.equal(account.getBalanceCents(), 10000);
  assert.deepEqual(account.debit(10000), { success: true, balanceCents: 0 });
});

test('credit rejects an amount that would exceed the balance limit without mutation', () => {
  const account = createAccount(MAX_AMOUNT_CENTS - 1);

  assert.deepEqual(account.credit(2), {
    success: false,
    reason: 'balance-limit',
    balanceCents: MAX_AMOUNT_CENTS - 1,
  });
  assert.equal(account.getBalanceCents(), MAX_AMOUNT_CENTS - 1);
});

test('menu integrates balance, credit, debit, invalid choice, and exit flows', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = '';
  output.on('data', (chunk) => {
    rendered += chunk.toString();
  });

  const app = runApp({ input, output });
  input.end('1\n2\n125.50\n3\n25.50\n9\n4\n');
  await app;

  assert.match(rendered, /Current balance: 1000\.00/);
  assert.match(rendered, /Amount credited\. New balance: 1125\.50/);
  assert.match(rendered, /Amount debited\. New balance: 1100\.00/);
  assert.match(rendered, /Invalid choice, please select 1-4\./);
  assert.match(rendered, /Exiting the program\. Goodbye!/);
});