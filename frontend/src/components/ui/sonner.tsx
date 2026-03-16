import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      richColors
      position="top-right"
      {...props}
    />
  )
}

export { Toaster }
