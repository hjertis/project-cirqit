// src/components/dashboard/ResourceUtilizationChart.tsx
import { Box } from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

// Sample data
const data = [
  { name: 'John D.', utilization: 85 },
  { name: 'Sarah M.', utilization: 65 },
  { name: 'Mike T.', utilization: 90 },
  { name: 'Emma R.', utilization: 40 },
  { name: 'Alex S.', utilization: 75 },
];

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          backgroundColor: 'background.paper',
          p: 1,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        <p><strong>{label}</strong></p>
        <p>{`Utilization: ${payload[0].value}%`}</p>
      </Box>
    );
  }
  return null;
};

export default function ResourceUtilizationChart() {
  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis unit="%" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="utilization" name="Utilization" fill="#3f51b5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}