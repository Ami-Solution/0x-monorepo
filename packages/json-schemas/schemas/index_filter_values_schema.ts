export const indexFilterValuesSchema = {
    id: '/indexFilterValuesSchema',
    additionalProperties: {
        oneOf: [{ $ref: '/numberSchema' }, { $ref: '/addressSchema' }, { $ref: '/orderHashSchema' }],
    },
    type: 'object',
};
