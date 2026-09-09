export type MenuItem = {
  id: string;
  name: string;
  category: string;
  variant: string | null;
  menu_price: number;
};

export type Order = {
  id: string;
  item_name: string;
  category: string;
  variant: string | null;
  menu_price_at_order: number;
  unit_price: number;
  quantity: number;
  total_price: number;
  created_at: string;
};

export type TallyRow = {
  /** Display label; disambiguated when one name spans several categories. */
  label: string;
  quantity: number;
  total: number;
};

export type PartyState = {
  trackedTotal: number;
  orderCount: number;
  itemCount: number;
  tally: TallyRow[];
  recent: Order[];
};
