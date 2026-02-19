import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Dragons & Fantasy category
  const cat = await prisma.category.findFirst({ 
    where: { slug: { contains: 'dragon' } } 
  });
  console.log('Category:', cat);
  
  if (cat) {
    // Count all pages
    const count = await prisma.coloringPage.count({ 
      where: { category: cat.slug } 
    });
    console.log('Total pages:', count);
    
    // Count by published status
    const published = await prisma.coloringPage.count({ 
      where: { category: cat.slug, published: true } 
    });
    console.log('Published pages:', published);
    
    // Count by status
    const statusCounts = await prisma.coloringPage.groupBy({
      by: ['status'],
      where: { category: cat.slug },
      _count: { id: true }
    });
    console.log('Status counts:', statusCounts);
    
    // Show sample pages
    const pages = await prisma.coloringPage.findMany({
      where: { category: cat.slug },
      take: 5,
      select: { id: true, slug: true, status: true, published: true }
    });
    console.log('Sample pages:', pages);
    
    // Check translations
    const translations = await prisma.coloringPageTranslation.count({
      where: { page: { category: cat.slug }, locale: 'en' }
    });
    console.log('English translations:', translations);
  }
}

main().finally(() => prisma.$disconnect());
