const products = [
  {
    id: 1,
    name: "Classic Tufted Upholstered Dining Chair",
    price: 110,
    oldPrice: 160,
    category: "Chair",
    image: "assets/dining_chair.png",
    description: "Elegant tufted design with premium gray fabric and sturdy wooden legs",
    featured: true,
    rating: 4.9,
    discount: 5,
    stock: 10
  },
  {
    id: 2,
    name: "Luna Rattan Papasan Chair",
    price: 170,
    oldPrice: 220,
    category: "Armchair",
    image: "assets/papasan_chair.png",
    description: "Bohemian-style rattan frame with plush cushion for ultimate comfort",
    featured: true,
    rating: 4.7,
    discount: 30,
    stock: 5
  },
  {
    id: 3,
    name: "Eleanor Tufted Velvet Loveseat Chair",
    price: 75,
    oldPrice: 110,
    category: "Dining Chair",
    image: "assets/nightstand.png",
    description: "Mid-century modern nightstand with two spacious drawers",
    featured: true,
    rating: 4.5,
    discount: 20,
    stock: 8
  },
  {
    id: 4,
    name: "Elara Mid-Century Modern Bar Stool",
    price: 500,
    oldPrice: 600,
    category: "Bar Stool",
    image: "assets/Frame.png",
    description: "Sleek mid-century bar stool with cream upholstered seat",
    featured: true,
    rating: 4.8,
    discount: 25,
    stock: 3
  },
  {
    id: 5,
    name: "Modern Minimalist Coffee Table",
    price: 250,
    oldPrice: 320,
    category: "Table",
    image: "assets/Frame.png",
    description: "Clean-lined coffee table with natural wood finish",
    featured: true,
    rating: 4.6,
    discount: 15,
    stock: 7
  },
  {
    id: 6,
    name: "Velvet Accent Lounge Chair",
    price: 340,
    oldPrice: 420,
    category: "Lounge Chair",
    image: "assets/dining_chair.png",
    description: "Luxurious velvet lounge chair with gold-tipped legs",
    featured: true,
    rating: 4.4,
    discount: 10,
    stock: 4
  }
];

if (!localStorage.getItem("products")) {
  localStorage.setItem("products", JSON.stringify(products));
} else {
  localStorage.setItem("products", JSON.stringify(products));
}
