const isAdmin = (user) => user.profile === 'Admin_c';
const isOwner = (record, user) => String(record.Owner?.Id ?? record.Owner) === String(user.Id);

export const select = (record, user) => {
  if (!user) return false;
  return isAdmin(user) || isOwner(record, user);
};

export const insert = (record, user) => {
  if (!user) return false;
  return true;
};

export const update = (record, user) => {
  if (!user) return false;
  return isAdmin(user) || isOwner(record, user);
};

export const remove = (record, user) => {
  if (!user) return false;
  return isAdmin(user) || isOwner(record, user);
};
