export const addNumberDots = (num: number) : string => (
  num.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.')
);
