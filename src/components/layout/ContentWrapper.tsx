import { ReactNode } from "react";
import { Box, BoxProps } from "@mui/material";

interface ContentWrapperProps extends BoxProps {
  children: ReactNode;
}

const ContentWrapper = ({ children, ...props }: ContentWrapperProps) => {
  return (
    <Box
      sx={{
        width: "100%",
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default ContentWrapper;
