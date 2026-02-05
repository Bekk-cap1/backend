type UniqueUser = {
  phone: string;
  password: string;
  email: string;
  username: string;
};

let counter = 0;

const runId =
  process.env.E2E_RUN_ID ??
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nextSuffix = (): string => {
  counter += 1;
  const seed = `${Date.now()}${counter}`;
  return seed.slice(-7).padStart(7, '0');
};

export const makeUniqueUser = (prefix = 'user'): UniqueUser => {
  const suffix = nextSuffix();
  const handle = `${prefix}-${runId}-${suffix}`.replace(/[^a-z0-9-]/gi, '');

  return {
    phone: `+99890${suffix}`,
    password: 'Password123!',
    email: `${handle}@example.test`,
    username: `${prefix}_${suffix}`,
  };
};
