import { Box, ImageListItem } from '@mui/material';

import { localizeStorefrontUrl } from '@/utils/localizeStorefrontUrl';

const LOGO_CONTAINER_SX = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  height: '100%',
};

interface LogoProps {
  logoUrl: string;
  logoAlt: string;
}

export function Logo({ logoUrl, logoAlt }: LogoProps) {
  return (
    <Box sx={LOGO_CONTAINER_SX}>
      <ImageListItem
        sx={{
          maxWidth: '250px',
        }}
        component="a"
        href={localizeStorefrontUrl('/')}
        target="_top"
      >
        <img src={logoUrl} alt={logoAlt} loading="lazy" />
      </ImageListItem>
    </Box>
  );
}
