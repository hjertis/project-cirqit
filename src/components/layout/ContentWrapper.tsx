// src/components/layout/ContentWrapper.tsx
import { ReactNode } from "react";
import { Box, BoxProps } from "@mui/material";

interface ContentWrapperProps extends BoxProps {
  children: ReactNode;
}

/**
 * A wrapper component to ensure consistent width and layout across pages
 * This can be used in individual page components to maintain consistent layout
 */
const ContentWrapper = ({ children, ...props }: ContentWrapperProps) => {
  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default ContentWrapper;
