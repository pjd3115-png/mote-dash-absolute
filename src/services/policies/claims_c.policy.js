const isAdmin = (user) => user.profile === 'Admin_c';

export const select = (record, user) => {
  if (!user) return false;
  return true;
};

export const insert = (record, user) => {
  if (!user) return false;
  return isAdmin(user);
};

export const update = (record, user) => {
  if (!user) return false;
  return isAdmin(user);
};

export const remove = (record, user) => {
  if (!user) return false;
  return isAdmin(user);
};
