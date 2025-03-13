// src/components/dashboard/StatCard.tsx
import { Box, Card, CardContent, Typography, SxProps, Theme } from '@mui/material';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon?: ReactNode;
  color?: string;
  sx?: SxProps<Theme>;
}

const StatCard = ({ title, value, icon, color = 'primary.main', sx }: StatCardProps) => {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            <Typography sx={{ color: 'text.secondary' }} gutterBottom>
              {title}
            </Typography>
          </Box>
          {icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${color}20`,
                borderRadius: '50%',
                width: 48,
                height: 48,
                color: color,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;