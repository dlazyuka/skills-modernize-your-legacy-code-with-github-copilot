'use strict';

const readline = require('node:readline');

const INITIAL_BALANCE_CENTS = 100000;
const MAX_AMOUNT_CENTS = 99999999;

function parseAmount(input) {
  if (typeof input !== 'string') {
    return null;
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) {
    return null;
  }

  const wholeUnits = Number(match[1]);
  const fractionalUnits = Number((match[2] || '').padEnd(2, '0'));
  const amountCents = wholeUnits * 100 + fractionalUnits;
  if (!Number.isSafeInteger(amountCents) || amountCents > MAX_AMOUNT_CENTS) {
    return null;
  }

  return amountCents;
}

function formatBalance(balanceCents) {
  const wholeUnits = Math.floor(balanceCents / 100);
  const fractionalUnits = String(balanceCents % 100).padStart(2, '0');
  return `${wholeUnits}.${fractionalUnits}`;
}

function createAccount(initialBalanceCents = INITIAL_BALANCE_CENTS) {
  if (!Number.isSafeInteger(initialBalanceCents) || initialBalanceCents < 0 || initialBalanceCents > MAX_AMOUNT_CENTS) {
    throw new RangeError('Initial balance is outside the supported range.');
  }

  let balanceCents = initialBalanceCents;

  return {
    getBalanceCents() {
      return balanceCents;
    },

    credit(amountCents) {
      if (!Number.isSafeInteger(amountCents) || amountCents < 0 || amountCents > MAX_AMOUNT_CENTS) {
        return { success: false, reason: 'invalid-amount', balanceCents };
      }
      if (balanceCents + amountCents > MAX_AMOUNT_CENTS) {
        return { success: false, reason: 'balance-limit', balanceCents };
      }

      balanceCents += amountCents;
      return { success: true, balanceCents };
    },

    debit(amountCents) {
      if (!Number.isSafeInteger(amountCents) || amountCents < 0 || amountCents > MAX_AMOUNT_CENTS) {
        return { success: false, reason: 'invalid-amount', balanceCents };
      }
      if (balanceCents < amountCents) {
        return { success: false, reason: 'insufficient-funds', balanceCents };
      }

      balanceCents -= amountCents;
      return { success: true, balanceCents };
    },
  };
}

function displayMenu(output) {
  output.write('--------------------------------\n');
  output.write('Account Management System\n');
  output.write('1. View Balance\n');
  output.write('2. Credit Account\n');
  output.write('3. Debit Account\n');
  output.write('4. Exit\n');
  output.write('--------------------------------\n');
  output.write('Enter your choice (1-4): ');
}

async function runApp({ input = process.stdin, output = process.stdout, account = createAccount() } = {}) {
  const lines = readline.createInterface({ input, crlfDelay: Infinity, terminal: false });
  const iterator = lines[Symbol.asyncIterator]();

  try {
    let running = true;
    while (running) {
      displayMenu(output);
      const choiceResult = await iterator.next();
      if (choiceResult.done) {
        break;
      }

      switch (choiceResult.value.trim()) {
        case '1':
          output.write(`Current balance: ${formatBalance(account.getBalanceCents())}\n`);
          break;
        case '2':
        case '3': {
          const isCredit = choiceResult.value.trim() === '2';
          output.write(isCredit ? 'Enter credit amount: ' : 'Enter debit amount: ');
          const amountResult = await iterator.next();
          if (amountResult.done) {
            running = false;
            break;
          }

          const amountCents = parseAmount(amountResult.value);
          if (amountCents === null) {
            output.write('Invalid amount. Enter a non-negative amount with up to two decimal places (maximum 999999.99).\n');
            break;
          }

          const result = isCredit ? account.credit(amountCents) : account.debit(amountCents);
          if (result.reason === 'insufficient-funds') {
            output.write('Insufficient funds for this debit.\n');
          } else if (result.reason === 'balance-limit') {
            output.write('Credit would exceed the maximum balance.\n');
          } else if (!result.success) {
            output.write('Invalid amount.\n');
          } else if (isCredit) {
            output.write(`Amount credited. New balance: ${formatBalance(result.balanceCents)}\n`);
          } else {
            output.write(`Amount debited. New balance: ${formatBalance(result.balanceCents)}\n`);
          }
          break;
        }
        case '4':
          running = false;
          break;
        default:
          output.write('Invalid choice, please select 1-4.\n');
      }
    }

    output.write('Exiting the program. Goodbye!\n');
  } finally {
    lines.close();
  }
}

if (require.main === module) {
  runApp().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  INITIAL_BALANCE_CENTS,
  MAX_AMOUNT_CENTS,
  createAccount,
  formatBalance,
  parseAmount,
  runApp,
};