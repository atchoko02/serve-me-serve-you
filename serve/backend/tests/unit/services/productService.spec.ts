// Unit tests for productService
import { test, expect } from '@playwright/test';
import * as productService from '../../../src/services/productService';
import { cleanupTestBusiness, waitForFirestoreWrite } from '../../helpers/firebase-helpers';
import { TEST_BUSINESS } from '../../helpers/test-helpers';

test.describe('ProductService', () => {
  const testBusinessId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  test.afterEach(async () => {
    await cleanupTestBusiness(testBusinessId);
    await waitForFirestoreWrite();
  });

  test.describe('getOrCreateBusiness', () => {
    test('creates new business if it does not exist', async () => {
      const business = await productService.getOrCreateBusiness(testBusinessId, {
        name: TEST_BUSINESS.name,
        email: TEST_BUSINESS.email,
      });

      expect(business.id).toBe(testBusinessId);
      expect(business.name).toBe(TEST_BUSINESS.name);
      expect(business.email).toBe(TEST_BUSINESS.email);
      expect(business.createdAt).toBeDefined();
      expect(business.updatedAt).toBeDefined();
    });

    test('returns existing business if it already exists', async () => {
      // Create business first
      const first = await productService.getOrCreateBusiness(testBusinessId, {
        name: TEST_BUSINESS.name,
        email: TEST_BUSINESS.email,
      });

      await waitForFirestoreWrite();

      // Get it again
      const second = await productService.getOrCreateBusiness(testBusinessId, {
        name: 'Different Name',
        email: 'different@example.com',
      });

      expect(second.id).toBe(first.id);
      expect(second.name).toBe(first.name); // Should return original, not updated
      expect(second.email).toBe(first.email);
    });
  });

  test.describe('storeProducts', () => {
    test.beforeEach(async () => {
      await productService.getOrCreateBusiness(testBusinessId, {
        name: TEST_BUSINESS.name,
        email: TEST_BUSINESS.email,
      });
      await waitForFirestoreWrite();
    });

    test('stores products successfully', async () => {
      const products = [
        {
          originalRow: ['1', 'Product A', '10.99', '4.5'],
          attributes: { id: '1', name: 'Product A', price: 10.99, rating: 4.5 },
        },
        {
          originalRow: ['2', 'Product B', '15.99', '4.2'],
          attributes: { id: '2', name: 'Product B', price: 15.99, rating: 4.2 },
        },
      ];

      const result = await productService.storeProducts(testBusinessId, products);

      expect(result.success).toBe(2);
      expect(result.errors).toBe(0);
    });

    test('handles products with generated IDs', async () => {
      const products = [
        {
          originalRow: ['Product A', '10.99'],
          attributes: { name: 'Product A', price: 10.99 },
        },
      ];

      const result = await productService.storeProducts(testBusinessId, products);

      expect(result.success).toBe(1);
      expect(result.errors).toBe(0);
    });

    test('stores empty array without errors', async () => {
      const result = await productService.storeProducts(testBusinessId, []);

      expect(result.success).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  test.describe('getProductsByBusiness', () => {
    test.beforeEach(async () => {
      await productService.getOrCreateBusiness(testBusinessId, {
        name: TEST_BUSINESS.name,
        email: TEST_BUSINESS.email,
      });
      await waitForFirestoreWrite();

      // Store some products
      const products = [
        {
          originalRow: ['1', 'Product A', '10.99'],
          attributes: { id: '1', name: 'Product A', price: 10.99 },
        },
        {
          originalRow: ['2', 'Product B', '15.99'],
          attributes: { id: '2', name: 'Product B', price: 15.99 },
        },
      ];
      await productService.storeProducts(testBusinessId, products);
      await waitForFirestoreWrite();
    });

    test('returns all products for a business', async () => {
      const products = await productService.getProductsByBusiness(testBusinessId);

      expect(products.length).toBeGreaterThanOrEqual(2);
      expect(products[0].businessId).toBe(testBusinessId);
      expect(products[0].attributes).toBeDefined();
      expect(products[0].originalRow).toBeDefined();
    });

    test('returns empty array for business with no products', async () => {
      const emptyBusinessId = `empty-${Date.now()}`;
      await productService.getOrCreateBusiness(emptyBusinessId, {
        name: 'Empty Business',
        email: 'empty@example.com',
      });
      await waitForFirestoreWrite();

      const products = await productService.getProductsByBusiness(emptyBusinessId);

      expect(products).toEqual([]);

      // Cleanup
      await cleanupTestBusiness(emptyBusinessId);
    });
  });

  test.describe('getProduct', () => {
    test.beforeEach(async () => {
      await productService.getOrCreateBusiness(testBusinessId, {
        name: TEST_BUSINESS.name,
        email: TEST_BUSINESS.email,
      });
      await waitForFirestoreWrite();

      const products = [
        {
          originalRow: ['1', 'Product A', '10.99'],
          attributes: { id: '1', name: 'Product A', price: 10.99 },
        },
      ];
      await productService.storeProducts(testBusinessId, products);
      await waitForFirestoreWrite();
    });

    test('returns product by ID', async () => {
      const product = await productService.getProduct(testBusinessId, '1');

      expect(product).not.toBeNull();
      expect(product!.id).toBe('1');
      expect(product!.attributes.name).toBe('Product A');
    });

    test('returns null for non-existent product', async () => {
      const product = await productService.getProduct(testBusinessId, 'non-existent');

      expect(product).toBeNull();
    });
  });

  test.describe('deleteAllProducts', () => {
    test.beforeEach(async () => {
      await productService.getOrCreateBusiness(testBusinessId, {
        name: TEST_BUSINESS.name,
        email: TEST_BUSINESS.email,
      });
      await waitForFirestoreWrite();
    });

    test('deletes all products for a business', async () => {
      // Store products
      const products = [
        {
          originalRow: ['1', 'Product A', '10.99'],
          attributes: { id: '1', name: 'Product A' },
        },
        {
          originalRow: ['2', 'Product B', '15.99'],
          attributes: { id: '2', name: 'Product B' },
        },
      ];
      await productService.storeProducts(testBusinessId, products);
      await waitForFirestoreWrite();

      // Verify they exist
      let allProducts = await productService.getProductsByBusiness(testBusinessId);
      expect(allProducts.length).toBeGreaterThanOrEqual(2);

      // Delete all
      await productService.deleteAllProducts(testBusinessId);
      await waitForFirestoreWrite();

      // Verify they're gone
      allProducts = await productService.getProductsByBusiness(testBusinessId);
      expect(allProducts.length).toBe(0);
    });
  });
});

