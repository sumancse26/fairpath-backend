import { describe, expect, it } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { Cookie } from './cookie.decorator.js';

function getParamDecoratorFactory(decorator: Function) {
  class TestClass {
    test(@decorator('user_id') _param: any) {}
  }

  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'test');
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
}

describe('Cookie decorator', () => {
  it('extracts named cookie from request header', () => {
    const factory = getParamDecoratorFactory(Cookie);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            cookie: 'session=abc; user_id=42; other=xyz',
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = factory('user_id', mockContext);
    expect(result).toBe('42');
  });

  it('returns undefined if cookie header is missing', () => {
    const factory = getParamDecoratorFactory(Cookie);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    const result = factory('user_id', mockContext);
    expect(result).toBeUndefined();
  });

  it('returns undefined if named cookie is not found', () => {
    const factory = getParamDecoratorFactory(Cookie);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            cookie: 'session=abc; other=xyz',
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = factory('user_id', mockContext);
    expect(result).toBeUndefined();
  });
});
