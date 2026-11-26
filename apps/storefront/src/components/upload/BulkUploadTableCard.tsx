import { Box, Typography } from '@mui/material';

import { useB3Lang } from '@/lib/lang';

interface BulkUploadTableCardProps {
  products: CustomFieldItems;
  activeTab: string;
}

function BulkUploadTableCard(props: BulkUploadTableCardProps) {
  const b3Lang = useB3Lang();
  const { products, activeTab } = props;

  const lineItemStyle = {
    display: 'flex',
  };

  return (
    <Box
      className="CSVProducts-info"
      key={products.sku}
      sx={{
        boxShadow:
          '0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px rgba(0, 0, 0, 0.14), 0px 1px 3px rgba(0, 0, 0, 0.12)',
        borderRadius: '4px',
        padding: '16px',
      }}
    >
      <Box sx={lineItemStyle}>
        <Typography
          sx={{
            color: '#313440',
            fontWeight: 700,
            fontSize: '16px',
            paddingRight: '0.5rem',
          }}
        >
          {b3Lang('global.bulkUpload.sku')}:{' '}
        </Typography>
        <span>{products.sku}</span>
      </Box>
      <Box sx={lineItemStyle}>
        <Typography
          sx={{
            color: '#313440',
            fontWeight: 700,
            fontSize: '16px',
            paddingRight: '0.5rem',
          }}
        >
          {b3Lang('global.searchProduct.qty')}:{' '}
        </Typography>
        <span>{products.qty}</span>
      </Box>

      {activeTab === 'error' && (
        <>
          <Box sx={lineItemStyle}>
            <Typography
              sx={{
                color: '#313440',
                fontWeight: 700,
                fontSize: '16px',
                paddingRight: '0.5rem',
              }}
            >
              {b3Lang('global.bulkUpload.row')}:{' '}
            </Typography>
            <span>{products.row + 1}</span>
          </Box>
          <Box sx={lineItemStyle}>
            <Typography
              sx={{
                color: '#313440',
                fontWeight: 700,
                fontSize: '16px',
                paddingRight: '0.5rem',
              }}
            >
              {b3Lang('global.bulkUpload.error')}:{' '}
            </Typography>
            <span>{products.error}</span>
          </Box>
        </>
      )}
    </Box>
  );
}

export default BulkUploadTableCard;
