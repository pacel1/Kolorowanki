import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find space vehicles category
  const cat = await prisma.category.findFirst({ 
    where: { slug: { contains: 'space' } } 
  });
  console.log('Category:', cat);
  
  if (cat) {
    // Count pages in this category
    const count = await prisma.coloringPage.count({ 
      where: { category: cat.slug } 
    });
    console.log('Total pages:', count);
    
    const published = await prisma.coloringPage.count({ 
      where: { category: cat.slug, published: true, status: 'PUBLISHED' } 
    });
    console.log('Published pages:', published);
    
    // Check translations
    const translations = await prisma.coloringPageTranslation.count({
      where: { page: { category: cat.slug }, locale: 'en' }
    });
    console.log('English translations:', translations);
    
    // Show some pages
    const pages = await prisma.coloringPage.findMany({
      where: { category: cat.slug },
      take: 5
    });
    console.log('Sample pages:', pages.map(p => ({ id: p.id, slug: p.slug, status: p.status, published: p.published })));
  }
}

main().finally(() => prisma.$disconnect());
