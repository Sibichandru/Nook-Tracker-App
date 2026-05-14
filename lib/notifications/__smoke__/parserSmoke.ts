/**
 * Smoke tests for `parseNotification`. Runs against hand-collected fixtures
 * modeled on real notifications from the supported Indian banking and UPI
 * apps. Synthesized, not captured — but the wording mirrors what these apps
 * actually push so the parser regexes are exercised on realistic shapes.
 *
 * Run: `npm run smoke:parser`
 *
 * If a fixture starts failing after a parser change, treat that as a real
 * regression unless the body wording is genuinely outside the supported
 * shape — in which case update the fixture explicitly with a comment.
 */

import { strict as assert } from 'node:assert';

import {
  parseNotification,
  type NotificationPayload,
  type ParsedTransaction,
} from '../parser.ts';

type Fixture = {
  name: string;
  payload: NotificationPayload;
  expect:
    | (Partial<Omit<ParsedTransaction, 'date' | 'time'>> & { _null?: false })
    | { _null: true };
};

// Fixed postTime so date/time output is stable across timezones, though we
// don't assert on those fields directly. Value: 2026-05-14 12:30 UTC.
const POST_TIME = Date.UTC(2026, 4, 14, 12, 30);

const fixtures: Fixture[] = [
  // PhonePe — debit, high confidence
  {
    name: 'PhonePe debit with merchant "SWIGGY"',
    payload: {
      packageName: 'com.phonepe.app',
      title: 'Payment Successful',
      body: 'You paid Rs 450.00 to SWIGGY via UPI on 14-May-26',
      postTime: POST_TIME,
    },
    expect: {
      amount: 450,
      type: 'expense',
      merchant: 'SWIGGY',
      paymentMethod: 'upi',
      confidence: 'high',
      source: 'notification',
      rawPackage: 'com.phonepe.app',
    },
  },

  // PhonePe — credit, high confidence
  {
    name: 'PhonePe credit from a person',
    payload: {
      packageName: 'com.phonepe.app',
      title: 'Payment received',
      body: 'You received Rs 200 from Rahul on 14-May',
      postTime: POST_TIME,
    },
    expect: {
      amount: 200,
      type: 'income',
      merchant: 'Rahul',
      paymentMethod: 'upi',
      confidence: 'high',
    },
  },

  // GPay — debit, ₹ symbol
  {
    name: 'Google Pay ₹ debit',
    payload: {
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Paid ₹250',
      body: 'You paid ₹250 to Reliance Trends via UPI',
      postTime: POST_TIME,
    },
    expect: {
      amount: 250,
      type: 'expense',
      merchant: 'Reliance Trends',
      paymentMethod: 'upi',
      confidence: 'high',
    },
  },

  // Paytm — debit with comma-grouped amount
  {
    name: 'Paytm debit Rs 1,250 with merchant',
    payload: {
      packageName: 'net.one97.paytm',
      title: 'Money Sent',
      body: 'Rs 1,250 spent at AMAZON.IN via UPI',
      postTime: POST_TIME,
    },
    expect: {
      amount: 1250,
      type: 'expense',
      merchant: 'AMAZON.IN',
      paymentMethod: 'upi',
      confidence: 'high',
    },
  },

  // HDFC bank — card debit
  {
    name: 'HDFC card debit at FLIPKART',
    payload: {
      packageName: 'com.snapwork.hdfc',
      title: 'Transaction Alert',
      body: 'Rs.500.00 debited from card XX1234 at FLIPKART on 14-MAY-26. Avl Bal Rs.10,000.',
      postTime: POST_TIME,
    },
    expect: {
      amount: 500,
      type: 'expense',
      merchant: 'FLIPKART',
      // "card" appears in body → bank guess upgraded to card
      paymentMethod: 'card',
      confidence: 'high',
    },
  },

  // HDFC bank — credit, large amount, merchant "ACME PVT LTD"
  {
    name: 'HDFC NEFT credit from ACME PVT LTD',
    payload: {
      packageName: 'com.snapwork.hdfc',
      title: 'Credit Alert',
      body: 'Rs.50000 credited to a/c XX1234 by NEFT from ACME PVT LTD',
      postTime: POST_TIME,
    },
    expect: {
      amount: 50000,
      type: 'income',
      merchant: 'ACME PVT LTD',
      paymentMethod: 'bank',
      confidence: 'high',
    },
  },

  // ICICI debit, merchant not on at/to/from line → medium confidence
  {
    name: 'ICICI debit with UPI ref, no clean merchant',
    payload: {
      packageName: 'com.csam.icici.bank.imobile',
      title: 'Debit Alert',
      body: 'Acct XX4321 debited with Rs 199 on 14-MAY-26; UPI/Swiggy/4321',
      postTime: POST_TIME,
    },
    expect: {
      amount: 199,
      type: 'expense',
      merchant: null,
      paymentMethod: 'bank',
      confidence: 'medium',
    },
  },

  // SBI salary credit — verb "credited", no at/to/from merchant
  {
    name: 'SBI IMPS salary credit, no merchant attribution',
    payload: {
      packageName: 'com.sbi.SBIFreedomPlus',
      title: 'Credit',
      body: 'INR 5000.00 credited to your account A/c XX9876 on 14-May-26 by IMPS Salary',
      postTime: POST_TIME,
    },
    expect: {
      amount: 5000,
      type: 'income',
      merchant: null,
      paymentMethod: 'bank',
      confidence: 'medium',
    },
  },

  // Axis card spend
  {
    name: 'Axis card spend at BIG BAZAAR',
    payload: {
      packageName: 'com.axis.mobile',
      title: 'Card Spend',
      body: 'Rs 2,500 spent on Axis Card XX1234 at BIG BAZAAR on 14-May-26',
      postTime: POST_TIME,
    },
    expect: {
      amount: 2500,
      type: 'expense',
      merchant: 'BIG BAZAAR',
      // "card" appears in body → bank guess upgraded
      paymentMethod: 'card',
      confidence: 'high',
    },
  },

  // Refund (credit with refund verb)
  {
    name: 'Amazon Pay refund',
    payload: {
      packageName: 'com.amazon.mShop.android.shopping',
      title: 'Refund processed',
      body: 'Rs 350 refunded from Amazon on 14-May',
      postTime: POST_TIME,
    },
    expect: {
      amount: 350,
      type: 'income',
      merchant: 'Amazon',
      paymentMethod: 'upi',
      confidence: 'high',
    },
  },

  // CRED card payment
  {
    name: 'CRED card payment to HDFC Card',
    payload: {
      packageName: 'com.cred.app',
      title: 'Payment Successful',
      body: 'You paid Rs 5,400 to HDFC Card via UPI',
      postTime: POST_TIME,
    },
    expect: {
      amount: 5400,
      type: 'expense',
      merchant: 'HDFC Card',
      paymentMethod: 'upi',
      confidence: 'high',
    },
  },

  // BHIM debit
  {
    name: 'BHIM payment to Uber',
    payload: {
      packageName: 'in.org.npci.upiapp',
      title: 'BHIM',
      body: 'You sent Rs 99 to Uber via UPI',
      postTime: POST_TIME,
    },
    expect: {
      amount: 99,
      type: 'expense',
      merchant: 'Uber',
      paymentMethod: 'upi',
      confidence: 'high',
    },
  },

  // Negative: package not on allowlist
  {
    name: 'Unknown app — rejected',
    payload: {
      packageName: 'com.somebrand.notifier',
      title: 'Get 50% off',
      body: 'Rs 999 deal at MyStore',
      postTime: POST_TIME,
    },
    expect: { _null: true },
  },

  // Negative: no amount → rejected even if verb present
  {
    name: 'No amount, only verb — rejected',
    payload: {
      packageName: 'com.phonepe.app',
      title: 'Hi',
      body: 'You paid your friend via UPI',
      postTime: POST_TIME,
    },
    expect: { _null: true },
  },

  // Negative: no verb (promotional)
  {
    name: 'Promotional message, no debit/credit verb — rejected',
    payload: {
      packageName: 'com.phonepe.app',
      title: 'Cashback offer',
      body: 'Get up to Rs 100 cashback on your next bill payment',
      postTime: POST_TIME,
    },
    expect: { _null: true },
  },
];

function runFixture(f: Fixture, index: number): void {
  const result = parseNotification(f.payload);
  const tag = `[${index + 1}/${fixtures.length}] ${f.name}`;

  if ('_null' in f.expect && f.expect._null === true) {
    assert.equal(
      result,
      null,
      `${tag}: expected null but got ${JSON.stringify(result)}`,
    );
    console.log(`✓ ${tag}`);
    return;
  }

  assert.notEqual(result, null, `${tag}: expected a parse result but got null`);
  if (!result) return; // narrow

  const expectRec = f.expect as Record<string, unknown>;
  const resultRec = result as unknown as Record<string, unknown>;
  for (const key of Object.keys(expectRec)) {
    if (key.startsWith('_')) continue;
    const expected: unknown = expectRec[key];
    const actual: unknown = resultRec[key];
    assert.equal(
      actual,
      expected,
      `${tag}: field "${key}" — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
  console.log(`✓ ${tag}`);
}

let failed = 0;
fixtures.forEach((f, i) => {
  try {
    runFixture(f, i);
  } catch (e) {
    failed += 1;
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`✗ ${msg}`);
  }
});

if (failed > 0) {
  console.error(`\n${failed} of ${fixtures.length} fixture(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${fixtures.length} fixtures passed`);
