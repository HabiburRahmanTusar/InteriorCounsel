import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

/**
 * Unwraps the standard backend response envelope ({ success, data, pagination, message }).
 */
export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event) => {
      if (event instanceof HttpResponse) {
        const body = event.body as any;
        if (body && typeof body === 'object' && 'success' in body) {
          if ('pagination' in body) {
            return event.clone({
              body: {
                data: body.data,
                pagination: body.pagination,
              },
            });
          } else if ('data' in body) {
            return event.clone({ body: body.data });
          }
        }
      }
      return event;
    })
  );
};
