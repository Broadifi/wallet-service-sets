module.exports = {
    /**
       *
       * @param {[] | {}} data
       * @param {{[totalCount]: number|null, [statusCode]: number, [deleted]: boolean | null, [updated]: boolean | null}} options
       */
    SendSuccessResponse(data, options = {
      totalCount: null,
      statusCode: 200,
      deleted: null,
      updated: null,
      hasNext: null,
      page: null,
    }) {
      const responseObj = {
        error: false,
        status: true,
        statusCode: 200,
        responseTimestamp: new Date(),
      };
      if (options.deleted !== null) {
        responseObj.deleted = options.deleted;
      }
      if (options.updated !== null) {
        responseObj.updated = options.updated;
      }
      if (options.totalCount !== null) {
        responseObj.totalCount = options.totalCount;
        // eslint-disable-next-line no-unused-expressions
        options.totalPages ? responseObj.totalPages = options.totalPages : null;
        // eslint-disable-next-line no-unused-expressions
        options.limit ? responseObj.limit = options.limit : null;
        // eslint-disable-next-line no-unused-expressions
        options.page ? responseObj.page = options.page : null;
        // eslint-disable-next-line no-unused-expressions
        typeof (options.hasNext) === 'boolean' ? responseObj.hasNext = options.hasNext : null;
      }
      responseObj.data = data;
      this.status(200).json(responseObj);
    },
  };
  